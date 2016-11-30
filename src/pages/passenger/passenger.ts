import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { AngularFire, FirebaseListObservable } from 'angularfire2';

//types
import { TripTypeEnum, TripObjectInterface, USERTYPES } from '../../app-types/app-types';

import { GoogleMapsAPIWrapper, MapsAPILoader } from 'angular2-google-maps/core';
import { TripMapPage } from '../trip-map/trip-map';
import { ErrorHandler } from '../../providers/errorhandler';
import { tripRawToDbObject } from '../../app-lib/utilities';

/*
  Generated class for the Passenger page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-passenger',
  templateUrl: 'passenger.html',
  providers: [GoogleMapsAPIWrapper],
})
export class PassengerPage {

  startTripLocation: any;
  endTripLocation: any;
  tripType: TripTypeEnum = TripTypeEnum.OneWay;
  allTripType = TripTypeEnum;
  currentTime: string = new Date().toISOString();
  maxTimeAccepted: string = new Date(Date.now() + 3600 * 1000 * 24 * 60).toISOString();
  endMaxTimeAccepted: string = this.maxTimeAccepted;
  dummyStartTime: number = 0;
  dummyEndTime: number = 0;

  trip: TripObjectInterface = {userType: USERTYPES.passenger.name };
  passengerTrips: FirebaseListObservable<any>;


  constructor(public navCtrl: NavController,
    public gApi: GoogleMapsAPIWrapper,
    public gLoader: MapsAPILoader,
    public af: AngularFire,
    public eh: ErrorHandler,
    private toastCtrl: ToastController
  ) {
    this.passengerTrips = this.af.database.list('/trips/passenger');
   }

  ionViewDidLoad() {
    this.trip.type = TripTypeEnum.OneWay;
    this.initAddressAutoComplete();
  }

  changeMaxTime(ev): void {
    let twoDigit = (v) => (v >= 10) ? v : `0${v}`;
    let { year: {value: Y}, month: {value: M}, day: {value: D}, hour: {value: H}, minute: {value: m} } = ev;
    //Note: format for the dateTime matters and following is the valid value. yyyy-mm-ddThh:min:secZ
    //Note: There is a bug with the input datatime as it doesnot respect the min value for the Hour and minute.
    this.endMaxTimeAccepted = `${Y}-${twoDigit(M + 2)}-${twoDigit(D)}T${twoDigit(H)}:${twoDigit(m)}:00Z`;
  }

  initAddressAutoComplete(): void {
    this.gLoader.load().then(() => {
      let startLocation = new google.maps.places.Autocomplete(document.getElementById("startLocation"), {});
      let endLocation = new google.maps.places.Autocomplete(document.getElementById("endLocation"), {});
      google.maps.event.addListener(startLocation, 'place_changed', () => {
        this.trip.startLocation = startLocation.getPlace().geometry;
        this.trip.startLocation.formatted_address = startLocation.getPlace().formatted_address;
      });

      google.maps.event.addListener(endLocation, 'place_changed', () => {
        this.trip.endLocation = endLocation.getPlace().geometry;
        this.trip.endLocation.formatted_address = endLocation.getPlace().formatted_address;
      });
    });
  }

  _areDatesValid(): boolean {
    this.dummyStartTime = (this.trip.startTime) ? +new Date(this.trip.startTime) : 0;
    if (this.dummyStartTime) {
      this.dummyEndTime = + new Date(this.trip.endTime);
      return this.dummyEndTime > this.dummyStartTime;
    }
    return true;
  }

  tripDatesOk(): boolean {
    if (!this._areDatesValid()) {
      this.showDateCorrectionToast();
      return false;
    }
    return true;
  }

  showDateCorrectionToast(): void {
    let toast = this.toastCtrl.create({
      message: 'Please correct trip end time.',
      duration: 3000,
      position: 'middle'
    });

    toast.onDidDismiss(() => {
      // console.log('Dismissed toast');
    });

    toast.present();
  }


  submitTripForm(ev: Event, tripFrom): void {
    ev.preventDefault();
    if (tripFrom.valid && this.tripDatesOk()) {
      //check if dates are valid
      let myDbOBject = tripRawToDbObject(this.trip);
      this.passengerTrips.push(myDbOBject)
        .then(() =>
          this.navCtrl.push(TripMapPage, {
            trip: this.trip
          })
        ).catch(this.eh.handle);
    }
  }

}